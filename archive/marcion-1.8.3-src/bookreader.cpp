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

#include "bookreader.h"
//
CBookReader::CBookReader( CMessages * const messages,
	QString const & filename,
        Format format,
        CBookTextBrowser::Script script,
        QString const & show_text,
QWidget * parent)
        : CTextBrowserExt(parent),
          messages(messages),
        format(format)
{
        init(QFileInfo(filename).fileName(),script);

        switch(format)
        {
            case Html :
            {
                browser()->setOpenLinks(true);
                browser()->setSource(QUrl::fromLocalFile(filename));
                break;
            }
            default :
            {
                if(!filename.isEmpty())
                {
                    QFile book(filename);
                    book.open(QIODevice::ReadOnly);
                    QByteArray text=book.readAll();
                    book.close();

                    if(filename.endsWith(".txt",Qt::CaseInsensitive))
                            browser()->setPlainText(QString::fromUtf8(text));
                    else if(filename.endsWith(".htm",Qt::CaseInsensitive)||
                            filename.endsWith(".html",Qt::CaseInsensitive))
                            browser()->setHtml(text);
                }
                break;
            }
        }
        //brBook->setOrigText();
        setPanelVisibility(true);
        allowChangeScript();

        if(!show_text.isEmpty())
            inputBox().setText(show_text);

        IC_SIZES
}

CBookReader::~CBookReader()
{
    RM_WND;
}

//


/*void CBookReader::on_brBook_customContextMenuRequested(QPoint )
{
	QAction * a;
	if((a=popup.exec(QCursor::pos())))
	{
		if(a->text()=="find")
		{
			QString st(brBook->textCursor().selectedText());
			if(!st.isEmpty())
				find_word(st);
		}
	}
}
void CBookReader::find_word(QString const & word)
{
	if(!preview)
	{
		preview=new CWordPreview(messages,crum);

		QObject::connect(preview,SIGNAL(close(CWordPreview *)),this,
			SLOT(on_preview_close(CWordPreview *)));
		messages->tab()->addTab(preview,"query from book");
		messages->tab()->setCurrentWidget(preview);
	}

	preview->queryCoptic(CTranslit::NAtoLatin(word));
	messages->tab()->setCurrentWidget(preview);

}*/
/*void CBookReader::on_preview_close(QWidget * p)
{
	preview=0;
	delete p;
}*/

void CBookReader::append(QString const & line)
{
    browser()->append(line);
}
