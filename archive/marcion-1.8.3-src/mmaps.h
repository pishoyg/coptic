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

#ifndef MMAPS_H
#define MMAPS_H

#include <QMainWindow>
#include <QMenu>
#include <QFileDialog>
#include <QTreeWidgetItem>

#include "messages.h"
#include "settings.h"
#include "cmysql.h"
#include "mimage.h"
#include "progressdialog.h"
#include "meditimgitem.h"
#include "mreorderimageitem.h"

class MMapTreeItem : public QTreeWidgetItem
{
public:
    MMapTreeItem();
    MMapTreeItem(MMapTreeItem const & other);
    ~MMapTreeItem(){}

    MMapTreeItem * _parentItem;
    QString _map,_filename;
    int _id;
    bool _is_image;
    short _from_age,_to_age;
    QList<double> _coord;
};

namespace Ui {
class MMaps;
}

class MMaps : public QMainWindow
{
    Q_OBJECT

public:
    explicit MMaps(QWidget *parent = 0);
    ~MMaps();

    bool loadData();
private:
    Ui::MMaps *ui;
    MButtonMenu popup;
    QMenu popupLoc;
    QAction * bkp_map,* del_map,*reload_maps,*create_col,*add_map,*edit_cm,*imp_img,*reorder_maps,*open_map,*exp_all,*expand,*collapse,*expand_all,*collapse_all;
    QAction * a_openloc;

    QList<QGraphicsItem*> _areas;
    QList<MMapTreeItem*> _all_items;
    QGraphicsRectItem *_last_area;

    static unsigned int _count;

    void checkZoomB(QToolButton * b);
    void deleteMap();
    void backupMap();
    void createCollection(),
        createMap(),
        editItem(),
        importImage(),
        reorderMaps();
        //setMapArea();
    double computeValue() const,computeWValue() const;
    void scaleArea(),scaleWArea();
    QString periodFromItem(MMapTreeItem * item) const;
    void dropArea(),dropLastArea();
private slots:
    void on_treeImages_customContextMenuRequested(QPoint pos);
    void on_btZD3_clicked();
    void on_btZD4_clicked();
    void on_btZD5_clicked();
    void on_btZD2_clicked();
    void on_btZ4_clicked();
    void on_btZ3_clicked();
    void on_btZ2_clicked();
    void on_btZ1_clicked();
    void on_sldZoom_valueChanged(int value);
    void on_treeImages_itemDoubleClicked(QTreeWidgetItem* item, int column);
    void on_btAction_clicked(bool checked);
    void on_sldZoom_sliderReleased();
    void on_sldWorldZoom_sliderReleased();
    void on_sldWorldZoom_valueChanged(int value);
    void on_treeImages_itemSelectionChanged();
    void on_btCheckMaps_clicked();
    void on_spnPeriodFrom_valueChanged(int arg1);
    void on_spnPeriodTo_valueChanged(int arg1);
    void on_treeMapLoc_itemDoubleClicked(QTreeWidgetItem *item, int);
    void on_treeMapLoc_customContextMenuRequested(const QPoint &);

    void slot_iwImg_resizeRequested(bool smaller);
    void slot_iwWorld_resizeRequested(bool smaller);

    void slot_beforeSceneResized();
    void slot_afterSceneResized();
    void slot_iwWorld_selectionChanged(QRectF selection);

    void on_actionClose_triggered();
    void on_actionAll_maps_triggered(bool checked);
    void on_actionDetected_maps_triggered(bool checked);
    void on_dwTree_visibilityChanged(bool visible);
    void on_dwMapLoc_visibilityChanged(bool visible);
    void on_treeMapLoc_currentItemChanged(QTreeWidgetItem *current, QTreeWidgetItem *);
    void on_actionCopy_coordinates_triggered();
};

#endif // MMAPS_H
