#ifndef MIMAGEBOOKREADER_H
#define MIMAGEBOOKREADER_H

#include <QMainWindow>
#include <QFileInfo>
#include <QDir>
#include <QToolButton>
#include <QMenu>
#include <QTreeWidgetItem>

#include "messages.h"
#include "settings.h"
#include "mimage.h"
#include "lsj.h"
#include "wordpreview.h"
#include "mwindowswidget.h"
#include "mcopticnumerals.h"
#include "mhebrdict.h"

namespace Ui {
class MImageBookReader;
}

class MImageBookReader : public QMainWindow
{
    Q_OBJECT

public:
    explicit MImageBookReader(QString const & filename,QWidget *parent = 0);
    ~MImageBookReader();

private:
    Ui::MImageBookReader *ui;
    QString const & filename;

    CLSJ * _gk;
    CWordPreview * _cop;
    MCopticNumerals * _num;
    MHebrDict * _heb;

    //void checkZoomB(QToolButton * b);
    void loadTree(QString const & f);
    double computeValue() const;
    void scaleArea();
private slots:
    void on_sldZoom_valueChanged(int value);
    void on_treeImages_currentItemChanged(QTreeWidgetItem* current, QTreeWidgetItem* previous);
    void on_btZD3_clicked();
    void on_btZD4_clicked();
    void on_btZD5_clicked();
    void on_btZD2_clicked();
    void on_btZ4_clicked();
    void on_btZ3_clicked();
    void on_btZ2_clicked();
    void on_btZ1_clicked();
    //void on_spnZoom_valueChanged(double );
    void on_sldZoom_sliderReleased();
    void on_cmbRot_currentIndexChanged(int index);
    void slot_iwImg_resizeRequested(bool smaller);
    void on_btZoomPlus_clicked();
    void on_btZoomMinus_clicked();
    void on_actionClose_triggered();
    void on_actionGk_Lat_dictionary_triggered();
    void on_actionCoptic_dictionary_triggered();
    void on_actionNumeric_converter_triggered();
    void on_action_Hebrew_dictionary_triggered();
};

#endif // MIMAGEBOOKREADER_H
