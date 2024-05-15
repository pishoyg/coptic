/*  Marcion
    Copyright (C) 2009-2016 Milan Konvicka

    This program is free software; you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation; either version 2 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License along
    with this program; if not, write to the Free Software Foundation, Inc.,
    51 Franklin Street, Fifth Floor, Boston, MA 02110-1301 USA. */

#include "marckeyb.h"
#include "ui_marckeyb.h"

CMarcKeyb::CMarcKeyb(Script script,QFont font,QString const & inittext,QComboBox * const target,bool inmenu,bool numeric,QWidget *parent) :
    QWidget(parent),
    ui(new Ui::CMarcKeyb),
    _script(script),_font(font),
    target(target),
    inmenu(inmenu),
    _numeric(numeric)
{
    ui->setupUi(this);

    if(inmenu)
        ui->btClose->hide();

    QString n(_numeric?QString(" (num)"):QString());
    switch(script)
    {
    case Coptic :
        setWindowTitle(tr("coptic keyboard")+n);
        break;
    case Greek :
        setWindowTitle(tr("greek keyboard")+n);
        break;
    case Hebrew :
        setWindowTitle(tr("hebrew keyboard")+n);
        break;
    case Latin :
        setWindowTitle(tr("latin keyboard")+n);
        break;
    }

    if(_numeric&&_script==Coptic)
        ui->board->hide();
    else
        ui->tabNumeric->hide();

    ui->txtText->setFont(_font);
    ui->txtText->setText(inittext);
    createKeyboard();

    IC_SIZES
    setMaximumSize(size());
    setMinimumSize(size());
}

CMarcKeyb::~CMarcKeyb()
{
    delete ui;
}

void CMarcKeyb::changeEvent(QEvent *e)
{
    QWidget::changeEvent(e);
    switch (e->type()) {
    case QEvent::LanguageChange:
        ui->retranslateUi(this);
        break;
    default:
        break;
    }
}

void CMarcKeyb::on_btOk_clicked()
{
    target->setEditText(outputText());
    if(!inmenu)
        close();
}

void CMarcKeyb::createKeyboard()
{
    static QString const
        alph_c(QString::fromUtf8("ⲁⲃⲅⲇⲉⲍⲏⲑⲓⲕⲗⲙⲛⲝⲟⲡⲣⲥⲧⲩⲫⲭⲯⲱϣϥϩϧⳉϫϭϯ")),
        alph_cn(QString::fromUtf8("ⲁⲃⲅⲇⲉⲋⲍⲏⲑⲓⲕⲗⲙⲛⲝⲟⲡϥⲣⲥⲧⲩⲫⲭⲯⲱⳁ")),
        alph_g(QString::fromUtf8("αβγδεζηθικλμνξοπρστυφχψω")),
        alph_gn(QString::fromUtf8("αβγδεϛζηθικλμνξοπϟρστυφχψωϡαβγδεϛζηθ")),
        alph_h(QString::fromUtf8("אבגדהוזחטיכלמנסעפצקרשתךםןףץ")),
        alph_hn(QString::fromUtf8("אבגדהוזחטיכלמנסעפצקרשתךםןףץ")),
        alph_l(QString::fromUtf8("abcdefghijklmnopqrstuvxyz"));

    QStringRef kb;
    switch(_script)
    {
    case Greek :
        if(_numeric)
            kb=&alph_gn;
        else
            kb=&alph_g;
        break;
    case Coptic :
        if(_numeric)
            kb=&alph_cn;
        else
            kb=&alph_c;
        break;
    case Hebrew :
        if(_numeric)
            kb=&alph_hn;
        else
            kb=&alph_h;
        break;
    case Latin :
        kb=&alph_l;
        break;
    }

    QFont _bfont(_font);
    _bfont.setBold(true);

    if(_numeric)
    {
        switch(_script)
        {
        case Hebrew :
        {
            int const d(9);
            for(int x=0;x<kb.count();x++)
            {
                QString chr(kb.at(x));
                int row=x/d,column=x%d;

                QPushButton * b = new QPushButton();
                b->setFont(_bfont);
                b->setText(chr);
                b->setFocusPolicy(Qt::NoFocus);
                b->setSizePolicy(QSizePolicy(QSizePolicy::Fixed, QSizePolicy::Fixed));

                connect(b,SIGNAL(clicked()),this,SLOT(slot_letterEmitted()));
                ui->gridLayout->addWidget(b,row,column);
            }

            QPushButton * b = new QPushButton();
            b->setFont(_bfont);
            b->setText(QString::fromUtf8("׳"));
            b->setFocusPolicy(Qt::NoFocus);
            b->setSizePolicy(QSizePolicy(QSizePolicy::Fixed, QSizePolicy::Fixed));

            connect(b,SIGNAL(clicked()),this,SLOT(slot_letterEmitted()));
            ui->gridLayout->addWidget(b,4,4);

            break;
        }
        case Coptic :
        {
            int const d(9);
            QGridLayout * gl[]={ui->gridLayoutNum1,
                               ui->gridLayoutNum2,
                               ui->gridLayoutNum3};
            QString aps[]={QString(0x0305),
                           QString(0x033f),
                           QString(0x20db)};
            for(int y=0;y<3;y++)
                for(int x=0;x<kb.count();x++)
                {
                    QString chr(kb.at(x));
                    chr.append(aps[y]);

                    int row=x/d,column=x%d;

                    QPushButton * b = new QPushButton();
                    b->setFont(_bfont);
                    b->setText(chr);
                    b->setFocusPolicy(Qt::NoFocus);
                    b->setSizePolicy(QSizePolicy(QSizePolicy::Fixed, QSizePolicy::Fixed));

                    connect(b,SIGNAL(clicked()),this,SLOT(slot_letterEmitted()));
                    gl[y]->addWidget(b,row,column);
                }

            break;
        }
        case Greek :
        {
            int const d(9);
            for(int x=0;x<kb.count();x++)
            {
                QString chr(kb.at(x));
                int row=x/d,column=x%d;
                if(row>2)
                    chr.prepend(QString(0x0375));

                QPushButton * b = new QPushButton();
                b->setFont(_bfont);
                b->setText(chr);
                b->setFocusPolicy(Qt::NoFocus);
                b->setSizePolicy(QSizePolicy(QSizePolicy::Fixed, QSizePolicy::Fixed));

                connect(b,SIGNAL(clicked()),this,SLOT(slot_letterEmitted()));
                ui->gridLayout->addWidget(b,row,column);
            }

            QPushButton * b = new QPushButton();
            b->setFont(_bfont);
            b->setText(QString::fromUtf8("Μ"));
            b->setFocusPolicy(Qt::NoFocus);
            b->setSizePolicy(QSizePolicy(QSizePolicy::Fixed, QSizePolicy::Fixed));

            connect(b,SIGNAL(clicked()),this,SLOT(slot_letterEmitted()));
            ui->gridLayout->addWidget(b,4,4);

            break;
        }
        default :
            return;
            break;
        }
    }
    else
    {
        int const d(8);
        for(int x=0;x<kb.count();x++)
        {
            QString chr(kb.at(x));
            int row=x/d,column=x%d;

            QPushButton * b = new QPushButton();
            b->setFont(_bfont);
            b->setText(chr);
            b->setFocusPolicy(Qt::NoFocus);
            b->setSizePolicy(QSizePolicy(QSizePolicy::Fixed, QSizePolicy::Fixed));

            connect(b,SIGNAL(clicked()),this,SLOT(slot_letterEmitted()));
            ui->gridLayout->addWidget(b,row,column);
        }
    }
}

void CMarcKeyb::slot_letterEmitted()
{
    ui->txtText->insert(((QPushButton*)QObject::sender())->text());
    //ui->txtText->setFocus();
}

QString CMarcKeyb::outputText() const
{
    return ui->txtText->text();
}

void CMarcKeyb::on_txtText_returnPressed()
{
    on_btOk_clicked();
}


void CMarcKeyb::on_btClose_clicked()
{
    if(!inmenu)
        close();
}
